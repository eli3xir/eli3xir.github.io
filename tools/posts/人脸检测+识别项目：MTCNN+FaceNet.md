---
title: 人脸检测+识别项目：MTCNN+FaceNet
categories:
  - 技术
  - 计算机视觉
tags:
  - MTCNN
  - 人脸识别
  - 神经网络
  - FaceNet
  - Flask
  - Keras
  - python
abbrlink: 39544
date: 2021-04-22 00:00:00
updated: 2021-04-27 00:00:00
---

项目地址：[https://gitee.com/sg2019/flask-face-recognition-api](https://gitee.com/sg2019/flask-face-recognition-api)

发行版下载地址：

- Windows/Mac：https://gitee.com/sg2019/flask-face-recognition-api/repository/archive/v1.1.0?format=zip

- Linux：https://gitee.com/sg2019/flask-face-recognition-api/repository/archive/v1.1.0?format=tar.gz

# MTCNN人脸检测

## MTCNN概述

MTCNN，英文全称是Multi-task convolutional neural network，中文全称是多任务卷积神经网络，总体可分为P-Net、R-Net、和O-Net三层网络结构。MTCNN在同一个网络里实现了人脸区域检测与人脸关键点五点标定的模型，主要通过CNN模型级联实现多任务学习网络，从而实现人脸检测与对齐。

整个模型分为三个阶段：

- 第一阶段（P-Net）：通过一个浅层的CNN网络快速产生一系列的候选窗口
- 第二阶段（R-Net）：通过一个能力更强的CNN网络过滤掉绝大部分非人脸候选窗口
- 第三阶段（O-Net）：通过一个能力更加强的网络找到人脸上面的五个标记点

完整的MTCNN模型级联如下：

![image-20210420144945504](https://gitee.com/sg2019/picgo/raw/master/image-20210420144945504.png)

该模型的特征跟HAAR级联检测在某些程度上有一定的相通之处，都是采用了级联方式，都是在初期就拒绝了绝大多数的图像区域，有效的降低了后期CNN网络的计算量与计算时间。

MTCNN模型主要贡献在于：

- 提供一种基于CNN方式的级联检测方法，基于轻量级的CNN模型实现人脸检测与点位标定，而且性能实时
- 实现了对难样本挖掘在线训练提升性能
- 一次可以完成多个任务

## MTCNN实现

### 1. 构建图像金字塔

#### 原理

图像金字塔是图像多尺度表达的一种常用方法，构造一系列以金字塔形状排列的、分辨率逐步降低、且来源于同一张原始图的图像集合，以适应不同大小的人脸，进行多尺度人脸检测。

构建方式是通过不同的缩放系数factor对图片进行缩放，每次缩小为原来的factor大小，在MTCNN代码中，按照习惯设为`factor = 0.709`。

对应图解：

![image-20210420151632498](https://gitee.com/sg2019/picgo/raw/master/image-20210420151632498.png)

#### 代码
```python
# 计算原始输入图像每一次缩放的比例
def calculateScales(img):
    pr_scale = 1.0
    h, w, _ = img.shape

    # 如果图像的短边大于500，则将短边固定为500
    # 如果图像的长边小于500，则将长边固定为500
    if min(w, h) > 500:
        pr_scale = 500.0 / min(h, w)
        w = int(w * pr_scale)
        h = int(h * pr_scale)
    elif max(w, h) < 500:
        pr_scale = 500.0 / max(h, w)
        w = int(w * pr_scale)
        h = int(h * pr_scale)

    # 建立图像金字塔的scales，防止图像的宽高小于12
    scales = []
    factor = 0.709
    factor_count = 0
    min_len = min(h, w)
    while min_len >= 12:
        scales.append(pr_scale * pow(factor, factor_count))
        min_len *= factor
        factor_count += 1
    return scales
```

### 2. P-Net

#### 原理

P-Net的全称为Proposal Network，即推荐网络，其基本的构造是一个全卷积网络。对上一步构建完成的图像金字塔，通过一个FCN进行初步特征提取与标定边框。

P-Net网络较为简单，但在完成初步提取后，还需要进行Bounding-Box Regression调整窗口与NMS进行大部分窗口的过滤。

P-Net有两个输出，`classifier`用于判断这个网格点上的框的可信度，`bbox_regress`表示框的位置。

`bbox_regress`并不代表这个框在图片上的真实位置，如果需要将`bbox_regress`映射到真实图像上，还需要进行一次解码过程。

解码过程利用`detect_face_12net`函数实现，其实现步骤如下（需要配合代码理解）：

1. 判断哪些网格点的置信度较高，即该网格点内存在人脸
2. 记录该网格点的x、y轴
3. 利用函数计算`bb1`和`bb2`，分别代表图中框的左上角基点和右下角基点，二者之间差了11个像素，堆叠得到`bounding_box `
4. 利用`bbox_regress`计算解码结果，解码公式为`bounding_box = bounding_box + offset*12.0*scale`

P-Net的输出将整个网格分割成若干个网格点，每个网格点初始状态下是一个11x11的框，之后`bbox_regress`代表每个网格点确定的框的**左上角基点和右下角基点**的偏移情况。

#### 代码

```python
# 粗略获取人脸框
def create_Pnet(weight_path):
    inputs = Input(shape=[None, None, 3])

    x = Conv2D(10, (3, 3), strides=1, padding='valid', name='conv1')(inputs)
    x = PReLU(shared_axes=[1,2],name='PReLU1')(x)
    x = MaxPool2D(pool_size=2)(x)

    x = Conv2D(16, (3, 3), strides=1, padding='valid', name='conv2')(x)
    x = PReLU(shared_axes=[1,2],name='PReLU2')(x)

    x = Conv2D(32, (3, 3), strides=1, padding='valid', name='conv3')(x)
    x = PReLU(shared_axes=[1,2],name='PReLU3')(x)

    classifier = Conv2D(2, (1, 1), activation='softmax', name='conv4-1')(x)
    # 无激活函数
    bbox_regress = Conv2D(4, (1, 1), name='conv4-2')(x)

    model = Model([inputs], [classifier, bbox_regress])
    model.load_weights(weight_path, by_name=True)
    return model
```

```python
# 对Pnet处理后的结果进行处理
def detect_face_12net(cls_prob, roi, out_side, scale, width, height, threshold):
    # 计算特征点之间的步长
    stride = 0
    if out_side != 1:
        stride = float(2 * out_side - 1) / (out_side - 1)

    # 获得满足得分门限的特征点的坐标
    (y, x) = np.where(cls_prob >= threshold)

    # 获得满足得分门限的特征点得分
    score = np.expand_dims(cls_prob[y, x], -1)

    # 将对应的特征点的坐标转换成位于原图上的先验框的坐标
    bounding_box = np.concatenate([np.expand_dims(x, -1), np.expand_dims(y, -1)], axis=-1)
    top_left = np.fix(stride * bounding_box + 0)
    bottom_right = np.fix(stride * bounding_box + 11)
    bounding_box = np.concatenate((top_left, bottom_right), axis=-1)
    bounding_box = (bounding_box + roi[y, x] * 12.0) * scale

    # 将预测框和得分堆叠，转换成正方形
    rectangles = np.concatenate((bounding_box, score), axis=-1)
    rectangles = rect2square(rectangles)

    rectangles[:, [1, 3]] = np.clip(rectangles[:, [1, 3]], 0, height)
    rectangles[:, [0, 2]] = np.clip(rectangles[:, [0, 2]], 0, width)
    return rectangles
```

### 3. R-Net

#### 原理

R-Net全称为Refine Network，即优化网络，其基本的构造是一个卷积神经网络。相对于第一层的P-Net来说，增加了一个全连接层，因此对于输入数据的筛选会更加严格。在图片经过P-Net后，会留下许多预测窗口，我们将所有的预测窗口送入R-Net，这个网络会滤除大量效果比较差的候选框。

最后对选定的候选框进行Bounding-Box Regression和NMS进一步优化预测结果。

R-Net有两个输出，`classifier`用于判断这个网格点上的框的可信度，`bbox_regress`表示框的位置。

`bbox_regress`并不代表这个框在图片上的真实位置，如果需要将`bbox_regress`映射到真实图像上，还需要进行一次解码过程。

#### 代码

```python
# 精修框
def create_Rnet(weight_path):
    inputs = Input(shape=[24, 24, 3])
    # 24,24,3 -> 22,22,28 -> 11,11,28
    x = Conv2D(28, (3, 3), strides=1, padding='valid', name='conv1')(inputs)
    x = PReLU(shared_axes=[1, 2], name='prelu1')(x)
    x = MaxPool2D(pool_size=3,strides=2, padding='same')(x)

    # 11,11,28 -> 9,9,48 -> 4,4,48
    x = Conv2D(48, (3, 3), strides=1, padding='valid', name='conv2')(x)
    x = PReLU(shared_axes=[1, 2], name='prelu2')(x)
    x = MaxPool2D(pool_size=3, strides=2)(x)

    # 4,4,48 -> 3,3,64
    x = Conv2D(64, (2, 2), strides=1, padding='valid', name='conv3')(x)
    x = PReLU(shared_axes=[1, 2], name='prelu3')(x)

    # 3,3,64 -> 64,3,3
    x = Permute((3, 2, 1))(x)
    x = Flatten()(x)

    # 576 -> 128
    x = Dense(128, name='conv4')(x)
    x = PReLU( name='prelu4')(x)

    # 128 -> 2
    classifier = Dense(2, activation='softmax', name='conv5-1')(x)
    # 128 -> 4
    bbox_regress = Dense(4, name='conv5-2')(x)

    model = Model([inputs], [classifier, bbox_regress])
    model.load_weights(weight_path, by_name=True)
    return model
```

```python
# 对R-Net处理后的结果进行处理
def filter_face_24net(cls_prob, roi, rectangles, width, height, threshold):
    # 利用得分进行筛选
    pick = cls_prob[:, 1] >= threshold
    
    score = cls_prob[pick, 1:2]
    rectangles = rectangles[pick, :4]
    roi = roi[pick, :]
    
    # 利用R-Net网络的预测结果对粗略预测框进行调整
    w = np.expand_dims(rectangles[:, 2] - rectangles[:, 0], -1)
    h = np.expand_dims(rectangles[:, 3] - rectangles[:, 1], -1)
    rectangles[:, [0, 2]] = rectangles[:, [0, 2]] + roi[:, [0, 2]] * w
    rectangles[:, [1, 3]] = rectangles[:, [1, 3]] + roi[:, [1, 3]] * w
    
    # 将预测框和得分进行堆叠，并转换成正方形
    rectangles = np.concatenate((rectangles, score), axis=-1)
    rectangles = rect2square(rectangles)
    
    rectangles[:, [1, 3]] = np.clip(rectangles[:, [1, 3]], 0, height)
    rectangles[:, [0, 2]] = np.clip(rectangles[:, [0, 2]], 0, width)
    return np.array(NMS(rectangles, 0.7))
```

### 4. O-Net

#### 原理

O-Net与R-Net工作流程类似，全称为Output Network，基本结构是一个较为复杂的卷积神经网络，相对于R-Net来说多了一个卷积层。O-Net的效果与R-Net的区别在于这一层结构会通过更多的监督来识别面部的区域，而且会对人的面部特征点进行回归，最终输出五个人脸面部特征点。

#### 代码

```python
#   精修框并定位五点
def create_Onet(weight_path):
    inputs = Input(shape = [48,48,3])
    # 48,48,3 -> 46,46,32 -> 23,23,32
    x = Conv2D(32, (3, 3), strides=1, padding='valid', name='conv1')(inputs)
    x = PReLU(shared_axes=[1,2],name='prelu1')(x)
    x = MaxPool2D(pool_size=3, strides=2, padding='same')(x)

    # 23,23,32 -> 21,21,64 -> 10,10,64
    x = Conv2D(64, (3, 3), strides=1, padding='valid', name='conv2')(x)
    x = PReLU(shared_axes=[1,2],name='prelu2')(x)
    x = MaxPool2D(pool_size=3, strides=2)(x)

    # 8,8,64 -> 4,4,64
    x = Conv2D(64, (3, 3), strides=1, padding='valid', name='conv3')(x)
    x = PReLU(shared_axes=[1,2],name='prelu3')(x)
    x = MaxPool2D(pool_size=2)(x)

    # 4,4,64 -> 3,3,128
    x = Conv2D(128, (2, 2), strides=1, padding='valid', name='conv4')(x)
    x = PReLU(shared_axes=[1,2],name='prelu4')(x)

    # 3,3,128 -> 128,12,12
    x = Permute((3,2,1))(x)
    x = Flatten()(x)

    # 1152 -> 256
    x = Dense(256, name='conv5') (x)
    x = PReLU(name='prelu5')(x)

    # 256 -> 2 
    classifier = Dense(2, activation='softmax',name='conv6-1')(x)
    # 256 -> 4 
    bbox_regress = Dense(4,name='conv6-2')(x)
    # 256 -> 10 
    landmark_regress = Dense(10,name='conv6-3')(x)

    model = Model([inputs], [classifier, bbox_regress, landmark_regress])
    model.load_weights(weight_path, by_name=True)
    return model
```

# FaceNet特征提取

## FaceNet概述

谷歌人脸识别算法，发表于 CVPR 2015，利用相同人脸在不同角度等姿态的照片下有高内聚性，不同人脸有低耦合性，提出使用 CNN + Triplet mining 方法，在 LFW 数据集上准确度达到 99.63%。

通过 CNN 将人脸映射到欧式空间的特征向量上，实质上：不同图片人脸特征的距离较大；通过相同个体的人脸的距离，总是小于不同个体的人脸这一先验知识训练网络。

测试时只需要计算人脸特征Embedding，然后计算距离使用阈值即可判定两张人脸照片是否属于相同的个体。

## FaceNet实现

FaceNet的主干网络起到提取特征的作用，传统的FaceNet以Inception-ResNetV1为主干特征提取网络。

MobilenetV1模型是Google针对手机等嵌入式设备提出的一种轻量级的深层神经网络，其使用的核心思想便是depthwise separable convolution（深度可分离卷积块）。

深度可分离卷积块由两个部分组成，分别是深度可分离卷积和1x1普通卷积，深度可分离卷积的卷积核大小一般是3x3的，便于理解的话我们可以把它当作是特征提取，1x1的普通卷积可以完成通道数的调整。

![20191030154355407](https://gitee.com/sg2019/picgo/raw/master/20191030154355407.png)

> **深度可分离卷积块的目的是使用更少的参数来代替普通的3x3卷积。**与普通卷积相比，深度可分离卷积结构块可以减少模型的参数。

```python
import math
import numpy as np
import tensorflow as tf

from keras import backend
from keras import backend as K
from keras.preprocessing import image
from keras.models import Model
from keras.layers.normalization import BatchNormalization
from keras.layers import Conv2D, Add, ZeroPadding2D, GlobalAveragePooling2D, Dropout, Dense, Lambda
from keras.layers import MaxPooling2D,Activation,DepthwiseConv2D,Input,GlobalMaxPooling2D
from keras.applications import imagenet_utils
from keras.applications.imagenet_utils import decode_predictions
from keras.utils.data_utils import get_file

def _conv_block(inputs, filters, kernel=(3, 3), strides=(1, 1)):
    x = Conv2D(filters, kernel,
               padding='same',
               use_bias=False,
               strides=strides,
               name='conv1')(inputs)
    x = BatchNormalization(name='conv1_bn')(x)
    return Activation(relu6, name='conv1_relu')(x)


def _depthwise_conv_block(inputs, pointwise_conv_filters,
                          depth_multiplier=1, strides=(1, 1), block_id=1):

    x = DepthwiseConv2D((3, 3),
                        padding='same',
                        depth_multiplier=depth_multiplier,
                        strides=strides,
                        use_bias=False,
                        name='conv_dw_%d' % block_id)(inputs)
    
    x = BatchNormalization(name='conv_dw_%d_bn' % block_id)(x)
    x = Activation(relu6, name='conv_dw_%d_relu' % block_id)(x)
    
    x = Conv2D(pointwise_conv_filters, (1, 1),
               padding='same',
               use_bias=False,
               strides=(1, 1),
               name='conv_pw_%d' % block_id)(x)
    x = BatchNormalization(name='conv_pw_%d_bn' % block_id)(x)
    return Activation(relu6, name='conv_pw_%d_relu' % block_id)(x)

def relu6(x):
    return K.relu(x, max_value=6)

def MobileNet(inputs, embedding_size=128, dropout_keep_prob=0.8, alpha=1.0, depth_multiplier=1):
    x = _conv_block(inputs, 32, strides=(2, 2))
    x = _depthwise_conv_block(x, 64, depth_multiplier, block_id=1)

    x = _depthwise_conv_block(x, 128, depth_multiplier, strides=(2, 2), block_id=2)
    x = _depthwise_conv_block(x, 128, depth_multiplier, block_id=3)
    
    x = _depthwise_conv_block(x, 256, depth_multiplier, strides=(2, 2), block_id=4)
    x = _depthwise_conv_block(x, 256, depth_multiplier, block_id=5)
    
    x = _depthwise_conv_block(x, 512, depth_multiplier, strides=(2, 2), block_id=6)
    x = _depthwise_conv_block(x, 512, depth_multiplier, block_id=7)
    x = _depthwise_conv_block(x, 512, depth_multiplier, block_id=8)
    x = _depthwise_conv_block(x, 512, depth_multiplier, block_id=9)
    x = _depthwise_conv_block(x, 512, depth_multiplier, block_id=10)
    x = _depthwise_conv_block(x, 512, depth_multiplier, block_id=11)
    
    x = _depthwise_conv_block(x, 1024, depth_multiplier, strides=(2, 2), block_id=12)
    x = _depthwise_conv_block(x, 1024, depth_multiplier, block_id=13)
```

![img](/assets/img/236bd9d67c24.png)

FaceNet总体训练流程如下：

- 将图像通过深度卷积神经网络映射到128维的特征空间（欧几里得空间）中，得到对应的128维特征向量
- 对特征向量进行L2​正则化，筛选出有效特征
- 使用正则化后的特征向量，计算Triplet Loss​

本项目采用[Keras FaceNet 预训练模型](https://drive.google.com/open?id=1pwQ3H4aJ8a6yyJHZkTwtjcL4wYWQb7bn)，可以从官网下载训练。

### 1. 根据初步特征获得128维特征向量

#### 原理

利用主干特征提取网络获得特征层，shape为`(batch_size, h, w, channels)`，可以将其取全局平均池化，方便后续的处理`(batch_size, channels)`。将平铺后的特征层进行神经元个数为128的全连接，此时相当于利用128维特征向量代替输入图片，128维特征向量即为输入图片的特征浓缩。

#### 代码

```python
x = GlobalAveragePooling2D()(x)
x = Dropout(1.0 - dropout_keep_prob, name='Dropout')(x)
x = Dense(classes, use_bias=False, name='Bottleneck')(x)
x = BatchNormalization(momentum=0.995, epsilon=0.001, scale=False,
                      name='BatchNorm_Bottleneck')(x)
```

### 2. L2标准化

#### 原理

在获得128维特征向量后，进行L2标准化处理，使得不同人脸的特征向量方便比较。在Keras中L2标准化很容易实现。

#### 代码

```python
x= Lambda(lambda  x: K.l2_normalize(x, axis=-1))(x)
# 创建模型
model = Model(inputs, x, name='inception_resnet_v1')
```

### 3. 构建分类器

#### 原理

仅考虑Triplet Loss会使得整个网络难以收敛，结合Cross-Entropy Loss和Triplet Loss作为总体loss。

- Triplet Loss用于进行不同人的人脸特征向量欧几里得距离的扩张，同一个人的不同状态的人脸特征向量欧几里得距离的缩小。
- Cross-Entropy Loss用于人脸分类，辅助Triplet Loss收敛。

> **关于Triplet Loss**
>
> 其输入是一个三元组(a, p, n)：
>
> - a：anchor，基准图片获得的128维人脸特征向量
> - p：positive，与基准图片属于同一张人脸的图片获得的128维人脸特征向量
> 
> - n：negative，与基准图片不属于同一张人脸的图片获得的128维人脸特征向量
> 
>将anchor和positive求欧几里得距离，并使其尽量小；将negative和positive求欧几里得距离，并使其尽量大。
> 
> 公式为：
> $$
>L=max(d(a,p)−d(a,n)+margin,0)
> $$
>
> d(a, p)是anchor和positive的欧几里得距离，d(a, n)是negative和positive的欧几里得距离，margin是常数。

对第2步获得的结果再次进行一个全连接用于分类。

#### 代码

```python
def facenet(input_shape, num_classes=None, backbone="mobilenet", mode="train"):
    inputs = Input(shape=input_shape)
    if backbone=="mobilenet":
        model = MobileNet(inputs)
    elif backbone=="inception_resnetv1":
        model = InceptionResNetV1(inputs)
    else:
        raise ValueError('Unsupported backbone - `{}`, Use mobilenet, inception_resnetv1.'.format(backbone))

    if mode == "train":
        x = Dense(num_classes)(model.output)
        x = Activation("softmax", name = "Softmax")(x)
        combine_model = Model(inputs,[x, model.output])
        return combine_model
    elif mode == "predict":
        return model
    else:
        raise ValueError('Unsupported mode - `{}`, Use train, predict.'.format(mode))
```

## FaceNet使用

FaceNet的使用步骤可以简化为如下四步：

1. 输入一张人脸图片
2. 通过深度卷积网络提取特征
3. L2标准化
4. 得到一个长度为128特征向量

# MTCNN人脸识别

## 数据库初始化

在人脸识别前，需要将存放已知人脸的数据库进行初始化。具体执行过程为：

1. 遍历数据库中所有的图片
2. 检测每个图片中的人脸位置
3. 利用MTCNN将人脸截取下载
4. 将获取到的人脸进行对齐
5. 利用FaceNet将人脸进行编码
6. 将所有人脸编码的结果存入列表

之后**获得的实时图片中的人脸**与**已知人脸进行比对**，即可计算门限值，从而得到得分最高的人脸。

## 实时图片处理

### 1. 人脸截取与对齐

#### 原理

本项目通过双眼坐标进行旋正，需要用到两个参数，分别是：

1. 眼睛连线相对于水平线的倾斜角。
2. 图片的中心。

通过上述两个参数，可以计算出**图片旋转的角度及中心**，`landmark`是五个人脸特征点的位置。

#### 代码

```python
def Alignment_1(img,landmark):

    if landmark.shape[0]==68:
        x = landmark[36,0] - landmark[45,0]
        y = landmark[36,1] - landmark[45,1]
    elif landmark.shape[0]==5:
        x = landmark[0,0] - landmark[1,0]
        y = landmark[0,1] - landmark[1,1]
    # 眼睛连线相对于水平线的倾斜角
    if x==0:
        angle = 0
    else: 
        # 计算它的弧度制
        angle = math.atan(y/x)*180/math.pi

    center = (img.shape[1]//2, img.shape[0]//2)
    
    RotationMatrix = cv2.getRotationMatrix2D(center, angle, 1)
    # 仿射函数
    new_img = cv2.warpAffine(img,RotationMatrix,(img.shape[1],img.shape[0])) 

    RotationMatrix = np.array(RotationMatrix)
    new_landmark = []
    for i in range(landmark.shape[0]):
        pts = []    
        pts.append(RotationMatrix[0,0]*landmark[i,0]+RotationMatrix[0,1]*landmark[i,1]+RotationMatrix[0,2])
        pts.append(RotationMatrix[1,0]*landmark[i,0]+RotationMatrix[1,1]*landmark[i,1]+RotationMatrix[1,2])
        new_landmark.append(pts)

    new_landmark = np.array(new_landmark)

    return new_img, new_landmark
```

### 2. FaceNet编码矫正的人脸

#### 原理

将第1步获得的对齐人脸传入facenet模型，可以得到每个人脸的特征向量。将所有特征向量保存在一个列表中，在第3步进行比对。

#### 代码

```python
height,width,_ = np.shape(draw)
draw_rgb = cv2.cvtColor(draw,cv2.COLOR_BGR2RGB)

# 检测人脸
rectangles = self.mtcnn_model.detectFace(draw_rgb, self.threshold)
print(np.shape(rectangles))
if len(rectangles)==0:
    return

# 转化成正方形
rectangles = utils.rect2square(np.array(rectangles,dtype=np.int32))
rectangles[:,0] = np.clip(rectangles[:,0],0,width)
rectangles[:,1] = np.clip(rectangles[:,1],0,height)
rectangles[:,2] = np.clip(rectangles[:,2],0,width)
rectangles[:,3] = np.clip(rectangles[:,3],0,height)

face_encodings = []
for rectangle in rectangles:
    # 获取landmark坐标
    landmark = (np.reshape(rectangle[5:15],(5,2)) - np.array([int(rectangle[0]),int(rectangle[1])]))/(rectangle[3]-rectangle[1])*160
    # 截取图像
    crop_img = draw_rgb[int(rectangle[1]):int(rectangle[3]), int(rectangle[0]):int(rectangle[2])]
    crop_img = cv2.resize(crop_img,(160,160))
    # 对齐
    new_img,_ = utils.Alignment_1(crop_img,landmark)
    new_img = np.expand_dims(new_img,0)
    # 计算128维特征向量
    face_encoding = utils.calc_128_vec(self.facenet_model,new_img)
    face_encodings.append(face_encoding)
```

### 3. 比对实时图片与数据库的人脸特征

#### 原理

比对过程大致如下：

1. 获取每一张实时图片的人脸特征
2. 将每一张图片的人脸特征和数据库中所有的人脸特征进行比较，计算距离
3. 如果距离小于门限值，则认为其具有一定的相似度
4. 获得每一张人脸在数据库中最相似的人脸的序号
5. 判断这个序号对应的人脸距离是否小于门限，是则认为人脸识别成功，否则认为无法识别（Unkown）

#### 代码

```python
face_names = []
for face_encoding in face_encodings:
    # 取出一张脸并与数据库中所有的人脸进行对比，计算得分
    matches = utils.compare_faces(self.known_face_encodings, face_encoding, tolerance = 0.9)
    name = "Unknown"
    # 找出距离最近的人脸
    face_distances = utils.face_distance(self.known_face_encodings, face_encoding)
    # 取出这个最近人脸的评分
    best_match_index = np.argmin(face_distances)
    if matches[best_match_index]:
        name = self.known_face_names[best_match_index]
    face_names.append(name)
```

# Flask 实现 RESTful API

## Flask概述

flask是一个使用Python编写的轻量级**Web应用框架**，WSGI工具箱采用Werkzeug，**模板引擎**则使用Jinja2。它没有默认使用的数据库、窗体验证工具，但保留了扩增的弹性，可以用flask-extension加入这些功能。由于其书写简单，扩展性强，成为了python最受欢迎的web框架之一。

## RESTful API

REST 是 Representational State Transfer的缩写，如果一个架构符合REST原则，就称它为RESTful架构。

- RESTful 架构可以充分的利用 HTTP 协议的各种功能，是 HTTP 协议的最佳实践 
- RESTful API 是一种软件架构风格、设计风格，可以让软件更加清晰，更简洁，更有层次，可维护性更好 

## Flask RESTful API 实现

### 1. 微信小程序数据转码

#### 原理

微信小程序调用摄像头获取视频帧，以数据流的形式存入`json`格式的接口，数据流采用`base64`算法编码。后端接收数据流后，需要先对`base64`格式的数据进行解码，再将解码得到的字符串转换为`numpy`列表，最后编码为`opencv`常用的`BGR`格式。

#### 代码

```python
def base64_to_image(base64_code):
    img_data = base64.b64decode(base64_code)
    img_array = np.fromstring(img_data, np.uint8)
    img = cv2.imdecode(img_array, cv2.COLOR_RGB2BGR)

    return img
```

### 2. 上传图片 API

#### 原理

如果要将图片上传至服务端，需要判断图片格式是否符合要求，进而获取图片存储路径，上传图片。

#### 代码

```python
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

    
@app.route('/api/upload', methods=['POST', 'GET'])
def upload():
    if request.method == 'POST':
        pic = request.files.get('pic')
        base_path = os.path.dirname(__file__)

        if pic and allowed_file(pic.filename):
            filename = secure_filename(pic.filename)

            upload_path = os.path.join(base_path, app.config['UPLOAD_FOLDER'], filename)
            upload_path = os.path.abspath(upload_path)

            pic.save(upload_path)
            return "{} Upload Success!".format(filename)
    return '''
        <!DOCTYPE html>
        <title>Upload new File</title>
        <h1>Upload new File</h1>
        <form action="" method=post enctype=multipart/form-data>
          <p><input type=file name=file>
             <input type=submit value=Upload></p>
        </form>
        '''
```



### 3. 人脸特征提取 API

#### 原理

通过以上实现的MTCNN + FaceNet，先进行人脸对齐，再对人脸特征进行提取，获得128维特征向量。最终，将提取的128维人脸特征向量转化为`json`格式，返回至前端。

#### 代码

```python
@app.route('/api/base64/align', methods=['POST', 'GET'])
def base64_align():
    if request.method == 'POST':
        pic = request.data.get('photo')
        pic = base64_to_image(pic)
        return json.dump(align.img_128_vec(pic))
    return '''
        WeiXin Camera data get failed
        '''
```
